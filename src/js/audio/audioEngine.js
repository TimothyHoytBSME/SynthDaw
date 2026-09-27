import { bus } from "../core/eventBus.js";
import { createSynthEngine } from "./synthEngine.js";
import { createDefaultPatch } from "./patch.js";
import { createMixer } from "./mixer.js";
import { getSelectedTrack } from "../core/selection.js";

const DEFAULT_VELOCITY = 100;
const PITCH_BEND_RANGE_CENTS = 200; // ±2 semitones, the common synth default
const PITCH_BEND_HALF_RANGE = 8192; // 14-bit MIDI pitch bend is centred on 8192
// Events on which Chrome has already registered the user gesture. Not pointerdown: for a mouse,
// Chrome dispatches pointerdown *before* it records the activation (that happens at
// mousedown), so audio started from pointerdown is refused with "not allowed to start".
const UNLOCK_EVENTS = ["mousedown", "click", "keydown", "touchend"];
// Fixed engine rate instead of the output device's native one. Chrome resamples to the device.
// Devices can run at 192 kHz, where every oscillator, filter and convolution reverb costs 4x as
// much: measured, the demo song's effect chains alone (no notes) needed 109% of real time at
// 192 kHz, so the audio thread overloaded and produced total silence. At 48 kHz: 14%.
const ENGINE_SAMPLE_RATE = 48000;

let audioContext = null;
let masterGain = null;
let synthEngine = null;
let mixer = null;
let project = null;
let mixerSyncQueued = false;
const fallbackPatch = createDefaultPatch();

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

// Creates the context and graph on first use. It deliberately does NOT resume the context:
// Chrome only lets a context start inside a user gesture, and resume() calls from timers or
// MIDI callbacks just log "The AudioContext was not allowed to start". unlockAudio() below is
// the one place that resumes, from real clicks/keypresses.
function ensureContext() {
  if (!audioContext) {
    audioContext = new (window.AudioContext || window.webkitAudioContext)({ sampleRate: ENGINE_SAMPLE_RATE });
    masterGain = audioContext.createGain();
    synthEngine = createSynthEngine(audioContext, masterGain);
    mixer = createMixer(audioContext, masterGain); // routes masterGain -> master effect chain -> destination
    audioContext.addEventListener("statechange", () => bus.emit("audio:state", { state: audioContext.state }));
    syncMixer();
  }
  return audioContext;
}

// Sticky activation: true once the user has clicked/tapped/typed on the page at all. Before
// that, Chrome refuses to start any AudioContext, so there's no point creating one (it would
// only log a warning and stay suspended). Browsers without the API are assumed permissive.
function hasUserActivation() {
  return navigator.userActivation?.hasBeenActive ?? true;
}

function unlockAudio() {
  if (!hasUserActivation()) {
    return;
  }
  const context = ensureContext();
  if (context.state !== "running") {
    context.resume().then(() => bus.emit("audio:state", { state: context.state }));
  }
}

// Live input (MIDI, computer keyboard, piano-roll previews) plays the selected track's
// instrument through that track's mixer bus, so it sounds exactly like the track's playback.
function handleNoteOn({ note, velocity = DEFAULT_VELOCITY }) {
  if (!hasUserActivation()) {
    return; // e.g. a MIDI note before any click: the browser won't let it sound anyway
  }
  ensureContext();
  const track = project ? getSelectedTrack(project) : null;
  if (track) {
    synthEngine.noteOn(note, velocity, track.patch, mixer.getTrackBus(track.id).gainNode);
  } else {
    synthEngine.noteOn(note, velocity, fallbackPatch);
  }
}

function handleNoteOff({ note }) {
  synthEngine?.noteOff(note);
}

function handlePitchBend({ value }) {
  if (!hasUserActivation()) {
    return;
  }
  ensureContext();
  synthEngine.setPitchBend((value / PITCH_BEND_HALF_RANGE) * PITCH_BEND_RANGE_CENTS);
}

export function initAudioEngine() {
  // Capture phase, so the context is resumed before any handler that plays sound (the Play
  // button, Space, computer-keyboard notes) runs for that same gesture. Kept registered
  // (not once-only) because Chrome can suspend a context again, e.g. after an output change.
  for (const type of UNLOCK_EVENTS) {
    window.addEventListener(type, unlockAudio, { capture: true });
  }
  bus.on("note:on", handleNoteOn);
  bus.on("note:off", handleNoteOff);
  bus.on("midi:pitchbend", handlePitchBend);
  bus.on("project:changed", queueMixerSync);
}

// The audio graph follows the project: every project:changed re-syncs the mixer from this
// object, so no UI code ever needs to poke the audio layer directly.
export function attachProject(theProject) {
  project = theProject;
  queueMixerSync();
}

// "not-started" until the first user action creates the context; otherwise the context's
// own state ("running", "suspended", "interrupted", "closed").
export function getAudioState() {
  return audioContext?.state ?? "not-started";
}

export function ensureAudioContext() {
  return ensureContext();
}

export function getMasterGain() {
  ensureContext();
  return masterGain;
}

export function scheduleNote(note, velocity, startTime, durationSeconds, patch, destinationNode) {
  ensureContext();
  synthEngine.scheduleNote(note, velocity, startTime, durationSeconds, patch, destinationNode);
}

export function cancelScheduledNotes() {
  synthEngine?.cancelScheduled();
}

export function getMixer() {
  ensureContext();
  return mixer;
}
