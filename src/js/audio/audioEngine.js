import { bus } from "../core/eventBus.js";
import { createSynthEngine } from "./synthEngine.js";
import { createDefaultPatch } from "./patch.js";

const MASTER_GAIN = 0.2;
const DEFAULT_VELOCITY = 100;

let audioContext = null;
let masterGain = null;
let synthEngine = null;
let currentPatch = createDefaultPatch();

function ensureContext() {
  if (!audioContext) {
    audioContext = new (window.AudioContext || window.webkitAudioContext)();
    masterGain = audioContext.createGain();
    masterGain.gain.value = MASTER_GAIN;
    masterGain.connect(audioContext.destination);
    synthEngine = createSynthEngine(audioContext, masterGain);
    synthEngine.setPatch(currentPatch);
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

export function scheduleNote(note, velocity, startTime, durationSeconds) {
  ensureContext();
  synthEngine.scheduleNote(note, velocity, startTime, durationSeconds);
}
