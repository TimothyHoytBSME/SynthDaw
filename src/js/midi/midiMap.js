import { bus } from "../core/eventBus.js";

const STORAGE_KEY = "synthdaw.midiMap";
const CC_MAX = 127;

// CC number -> target path (e.g. "patch:filter.cutoff"). Mappings describe the user's hardware,
// not a project, so they live in localStorage rather than in the (exportable) project.
let mappings = {};
let learnTarget = null;

function load() {
  try {
    mappings = JSON.parse(localStorage.getItem(STORAGE_KEY)) ?? {};
  } catch {
    mappings = {};
  }
}

function save() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(mappings));
  } catch {
    // Storage unavailable (private mode, quota): mappings still work for this session.
  }
}

function notify() {
  bus.emit("midimap:changed", { learnTarget });
}

function removeTarget(target) {
  for (const [cc, mapped] of Object.entries(mappings)) {
    if (mapped === target) {
      delete mappings[cc];
    }
  }
}

function handleControlChange({ controller, value }) {
  if (learnTarget) {
    removeTarget(learnTarget);
    mappings[controller] = learnTarget;
    learnTarget = null;
    save();
    notify();
    return;
  }
  const target = mappings[controller];
  if (target) {
    bus.emit("midimap:control", { target, normalized: value / CC_MAX });
  }
}

// The next CC that arrives gets mapped to `target` (replacing any previous CC for it).
export function startLearning(target) {
  learnTarget = target;
  notify();
}

export function cancelLearning() {
  learnTarget = null;
  notify();
}

export function clearMapping(target) {
  removeTarget(target);
  save();
  notify();
}

export function getLearnTarget() {
  return learnTarget;
}

export function getMappedController(target) {
  const entry = Object.entries(mappings).find(([, mapped]) => mapped === target);
  return entry ? Number(entry[0]) : null;
}

export function initMIDIMap() {
  load();
  bus.on("midi:cc", handleControlChange);
}
