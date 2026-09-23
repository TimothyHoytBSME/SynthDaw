import { createTransport } from "./transport.js";
import { playClick } from "../audio/click.js";
import { ensureAudioContext, getMasterGain } from "../audio/audioEngine.js";

let transport = null;
let metronomeEnabled = true;
let beatsPerBar = 4;

function handleClick(beat, time) {
  if (!metronomeEnabled) {
    return;
  }
  const accented = Math.round(beat) % beatsPerBar === 0;
  playClick(ensureAudioContext(), getMasterGain(), time, accented);
}

export function getTransport({ beatsPerBar: bpb } = {}) {
  if (bpb) {
    beatsPerBar = bpb;
  }
  if (!transport) {
    transport = createTransport(ensureAudioContext(), { onClick: handleClick });
  }
  return transport;
}

export function setMetronomeEnabled(enabled) {
  metronomeEnabled = enabled;
}

export function isMetronomeEnabled() {
  return metronomeEnabled;
}
