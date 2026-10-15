import { getTransport } from "./transportController.js";
import { undo, redo } from "./history.js";
import { bus } from "./eventBus.js";
import { clearBlockSelection, getSelectedBlock, isEditingBlock } from "./selection.js";
import {
  copySelectedBlock,
  cutSelectedBlock,
  pasteBlock,
  deleteSelectedBlock,
  duplicateSelectedBlock,
  transposeSelectedBlock,
  transposeSelectedBlockByOctaves,
} from "./blockActions.js";

const FIELD_TAGS = new Set(["INPUT", "SELECT", "TEXTAREA"]);

function isTypingInField() {
  return FIELD_TAGS.has(document.activeElement?.tagName) || document.activeElement?.isContentEditable;
}

function togglePlayback() {
  const transport = getTransport();
  if (transport.isRunning()) {
    transport.pause();
  } else {
    transport.play();
  }
}

// Returns true if the key was handled. Modifier-free keys only; letter keys belong to
// computerKeyboard.js (note input), so nothing here may claim a bare letter.
function handlePlainKey(event, project) {
  const blockKeys = ["Delete", "Backspace", "ArrowUp", "ArrowDown"];
  // With the piano roll open these keys mean notes (handled by the roll when it has a
  // selection), never the block being edited.
  if (blockKeys.includes(event.key) && (!getSelectedBlock(project) || isEditingBlock())) {
    return false; // leave arrows (page scroll) and Backspace alone when there's nothing to act on
  }
  switch (event.key) {
    case " ":
      togglePlayback();
      return true;
    case "Home":
      getTransport().seek(0);
      return true;
    case "Delete":
    case "Backspace":
      deleteSelectedBlock(project);
      return true;
    case "Escape":
      clearBlockSelection();
      return true;
    case "ArrowUp":
    case "ArrowDown": {
      const direction = event.key === "ArrowUp" ? 1 : -1;
      if (event.shiftKey) {
        transposeSelectedBlockByOctaves(project, direction);
      } else {
        transposeSelectedBlock(project, direction);
      }
      return true;
    }
    default:
      return false;
  }
}

function handleModifiedKey(event, project) {
  const key = event.key.toLowerCase();
  if (key === "z" && event.shiftKey) {
    redo();
  } else if (key === "z") {
    undo();
  } else if (key === "y") {
    redo();
  } else if (key === "d" && getSelectedBlock(project) && !isEditingBlock()) {
    duplicateSelectedBlock(project);
  } else if (key === "s") {
    bus.emit("shortcut:export-json", {}); // projectControls.js downloads the project
  } else if (key === "c" && getSelectedBlock(project)) {
    copySelectedBlock(project);
  } else if (key === "x" && getSelectedBlock(project)) {
    cutSelectedBlock(project);
  } else if (key === "v") {
    pasteBlock(project);
  } else {
    return false;
  }
  return true;
}

export function initKeyboardShortcuts(project) {
  window.addEventListener("keydown", (event) => {
    if (isTypingInField() || event.altKey) {
      return;
    }
    // The open piano roll gets first refusal (note selection: Delete, arrows, Ctrl+A/C/X/V/D).
    if (isEditingBlock()) {
      const request = { key: event.key, shiftKey: event.shiftKey, ctrlKey: event.ctrlKey, metaKey: event.metaKey, handled: false };
      bus.emit("pianoroll:key", request);
      if (request.handled) {
        event.preventDefault();
        return;
      }
    }
    const handled =
      event.ctrlKey || event.metaKey ? handleModifiedKey(event, project) : handlePlainKey(event, project);
    if (handled) {
      event.preventDefault();
    }
  });
}
