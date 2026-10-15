import { bus } from "./eventBus.js";
import { replaceProjectContents } from "./project.js";

const DEBOUNCE_MS = 500;

let project = null;
let onRestore = null;
let lastSnapshot = null;
let debounceTimer = null;
let isRestoring = false;
const undoStack = [];
const redoStack = [];

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function notifyHistoryChanged() {
  bus.emit("history:changed", { canUndo: undoStack.length > 0, canRedo: redoStack.length > 0 });
}

// Coalesces a burst of rapid changes (e.g. every pointermove during one drag, each of which
// calls a project.js mutator) into a single undo step: the *first* change in a burst pushes
// whatever was last settled (`lastSnapshot`) onto the undo stack; later changes in the same
// burst just keep resetting the debounce timer. `lastSnapshot` only advances once the burst
// goes quiet, so it always represents "the state right before the change(s) in progress."
function handleChanged() {
  if (isRestoring) {
    // replaceProjectContents (called by restore() below) emits project:changed too, same as
    // any normal edit — that's needed so persistence.js still autosaves after an undo/redo,
    // but this module must not treat its own restore as a new undoable edit.
    return;
  }
  if (!debounceTimer) {
    undoStack.push(lastSnapshot);
    redoStack.length = 0;
    notifyHistoryChanged();
  }
  clearTimeout(debounceTimer);
  debounceTimer = setTimeout(() => {
    lastSnapshot = clone(project);
    debounceTimer = null;
  }, DEBOUNCE_MS);
}

// A wholesale replacement (New, Import, Load Demo) ends the current burst at once, so the
// replacement and whatever the user edits right afterwards stay separate undo steps.
function settleNow() {
  if (isRestoring || !debounceTimer) {
    return;
  }
  clearTimeout(debounceTimer);
  debounceTimer = null;
  lastSnapshot = clone(project);
}

export function initHistory(theProject, restoreCallback) {
  project = theProject;
  onRestore = restoreCallback;
  lastSnapshot = clone(project);
  bus.on("project:changed", handleChanged);
  bus.on("project:replaced", settleNow);
  notifyHistoryChanged();
}

function restore(snapshot) {
  isRestoring = true;
  replaceProjectContents(project, snapshot, { backup: false });
  isRestoring = false;
  lastSnapshot = clone(project);
  clearTimeout(debounceTimer);
  debounceTimer = null;
  onRestore?.();
  notifyHistoryChanged();
}

export function undo() {
  if (undoStack.length === 0) {
    return;
  }
  redoStack.push(clone(project));
  restore(undoStack.pop());
}

export function redo() {
  if (redoStack.length === 0) {
    return;
  }
  undoStack.push(clone(project));
  restore(redoStack.pop());
}

export function canUndo() {
  return undoStack.length > 0;
}

export function canRedo() {
  return redoStack.length > 0;
}
