import { bus } from "../core/eventBus.js";
import { createSynthEngine } from "./synthEngine.js";
import { createDefaultPatch } from "./patch.js";
import { createMixer } from "./mixer.js";

const DEFAULT_VELOCITY = 100;

let audioContext = null;
let masterGain = null;
let synthEngine = null;
let mixer = null;
let project = null;
let mixerSyncQueued = false;
let currentPatch = createDefaultPatch();

function syncMixer() {
  mixerSyncQueued = false;
  if (mixer && project) {
    mixer.syncProject(project);
  }
}

// Coalesces a burst of synchronous project changes (e.g. a restore, or several mutators called
// in one handler) into one mixer reconcile at the end of the current task.
function queueMixerSync() {
  if (!mixerSyncQueued) {
    mixerSyncQueued = true;
    queueMicrotask(syncMixer);
  }
}

function ensureContext() {
  if (!audioContext) {
    audioContext = new (window.AudioContext || window.webkitAudioContext)();
    masterGain = audioContext.createGain();
    synthEngine = createSynthEngine(audioContext, masterGain);
    synthEngine.setPatch(currentPatch);
    mixer = createMixer(audioContext, masterGain); // routes masterGain -> master effect chain -> destination
    syncMixer();
  }
  if (audioContext.state === "suspended") {
    audioContext.resume();
  }
  return audioContext;
}

function handleNoteOn({ note, velocity = DEFAULT_VELOCITY }) {
  ensureContext();
  synthEngine.noteOn(note, velocity);
}

function handleNoteOff({ note }) {
  synthEngine?.noteOff(note);
}

export function initAudioEngine() {
  bus.on("note:on", handleNoteOn);
  bus.on("note:off", handleNoteOff);
  bus.on("project:changed", queueMixerSync);
}

// The audio graph follows the project: every project:changed re-syncs the mixer from this
// object, so no UI code ever needs to poke the audio layer directly.
export function attachProject(theProject) {
  project = theProject;
  queueMixerSync();
}

export function ensureAudioContext() {
  return ensureContext();
}

export function getMasterGain() {
  ensureContext();
  return masterGain;
}

export function getPatch() {
  return currentPatch;
}

export function setPatch(nextPatch) {
  currentPatch = nextPatch;
  synthEngine?.setPatch(currentPatch);
}

export function scheduleNote(note, velocity, startTime, durationSeconds, destinationNode) {
  ensureContext();
  synthEngine.scheduleNote(note, velocity, startTime, durationSeconds, destinationNode);
}

export function cancelScheduledNotes() {
  synthEngine?.cancelScheduled();
}

export function getMixer() {
  ensureContext();
  return mixer;
}
