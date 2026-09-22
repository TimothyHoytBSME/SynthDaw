import { bus } from "../core/eventBus.js";
import { createVoice } from "./voice.js";

const MASTER_GAIN = 0.2;

let audioContext = null;
let masterGain = null;
const activeVoices = new Map();

function noteToFrequency(note) {
  return 440 * 2 ** ((note - 69) / 12);
}

function ensureContext() {
  if (!audioContext) {
    audioContext = new (window.AudioContext || window.webkitAudioContext)();
    masterGain = audioContext.createGain();
    masterGain.gain.value = MASTER_GAIN;
    masterGain.connect(audioContext.destination);
  }
  if (audioContext.state === "suspended") {
    audioContext.resume();
  }
  return audioContext;
}

function handleNoteOn({ note }) {
  ensureContext();
  if (activeVoices.has(note)) {
    return;
  }
  const voice = createVoice(audioContext, masterGain, noteToFrequency(note));
  voice.start();
  activeVoices.set(note, voice);
}

function handleNoteOff({ note }) {
  const voice = activeVoices.get(note);
  if (!voice) {
    return;
  }
  voice.stop();
  activeVoices.delete(note);
}

export function initAudioEngine() {
  bus.on("note:on", handleNoteOn);
  bus.on("note:off", handleNoteOff);
}
