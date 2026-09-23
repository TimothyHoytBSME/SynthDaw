import { bus } from "../core/eventBus.js";
import { createSynthEngine } from "./synthEngine.js";
import { createDefaultPatch } from "./patch.js";
import { createMixer } from "./mixer.js";

const MASTER_GAIN = 0.2;
const DEFAULT_VELOCITY = 100;

let audioContext = null;
let masterGain = null;
let synthEngine = null;
let mixer = null;
let currentPatch = createDefaultPatch();

function ensureContext() {
  if (!audioContext) {
    audioContext = new (window.AudioContext || window.webkitAudioContext)();
    masterGain = audioContext.createGain();
    masterGain.gain.value = MASTER_GAIN;
    synthEngine = createSynthEngine(audioContext, masterGain);
    synthEngine.setPatch(currentPatch);
    mixer = createMixer(audioContext, masterGain); // routes masterGain -> master effect chain -> destination
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

function handleTrackRemoved({ trackId }) {
  mixer?.removeTrackBus(trackId);
}

export function initAudioEngine() {
  bus.on("note:on", handleNoteOn);
  bus.on("note:off", handleNoteOff);
  bus.on("track:removed", handleTrackRemoved);
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

export function getMixer() {
  ensureContext();
  return mixer;
}
