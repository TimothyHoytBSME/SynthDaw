import { bus } from "../core/eventBus.js";

const STATUS_NOTE_OFF = 0x80;
const STATUS_NOTE_ON = 0x90;
const STATUS_CONTROL_CHANGE = 0xb0;
const STATUS_PITCH_BEND = 0xe0;
const CC_SUSTAIN_PEDAL = 64;
const SUSTAIN_ON_THRESHOLD = 64;

let midiAccess = null;
// Sustain pedal: while it's down, key releases are held back (per channel) and emitted as
// note-offs when it lifts, so both the synth and the recorder see pedal-length notes.
const sustainDown = new Set(); // channels with the pedal down
const sustainedNotes = new Map(); // channel -> Set of note numbers released under the pedal

function emitNoteOff(note, channel) {
  bus.emit("note:off", { note, channel, source: "midi" });
}

function handleNoteOff(note, channel) {
  if (sustainDown.has(channel)) {
    if (!sustainedNotes.has(channel)) {
      sustainedNotes.set(channel, new Set());
    }
    sustainedNotes.get(channel).add(note);
    return;
  }
  emitNoteOff(note, channel);
}

function handleSustainPedal(value, channel) {
  if (value >= SUSTAIN_ON_THRESHOLD) {
    sustainDown.add(channel);
    return;
  }
  sustainDown.delete(channel);
  const held = sustainedNotes.get(channel);
  sustainedNotes.delete(channel);
  held?.forEach((note) => emitNoteOff(note, channel));
}

export function handleMIDIMessage(event) {
  const [statusByte, data1, data2] = event.data;
  const command = statusByte & 0xf0;
  const channel = statusByte & 0x0f;

  switch (command) {
    case STATUS_NOTE_ON:
      if (data2 > 0) {
        // Re-striking a key held by the pedal starts a fresh press; drop the pending release.
        sustainedNotes.get(channel)?.delete(data1);
        bus.emit("note:on", { note: data1, velocity: data2, channel, source: "midi" });
      } else {
        // Many controllers send note-on with velocity 0 instead of a real note-off.
        handleNoteOff(data1, channel);
      }
      break;
    case STATUS_NOTE_OFF:
      handleNoteOff(data1, channel);
      break;
    case STATUS_CONTROL_CHANGE:
      if (data1 === CC_SUSTAIN_PEDAL) {
        handleSustainPedal(data2, channel);
      }
      bus.emit("midi:cc", { controller: data1, value: data2, channel });
      break;
    case STATUS_PITCH_BEND: {
      const raw = (data2 << 7) | data1; // 14-bit, 0..16383, center 8192
      bus.emit("midi:pitchbend", { value: raw - 8192, channel });
      break;
    }
    default:
      break;
  }
}

function attachInput(input) {
  input.onmidimessage = handleMIDIMessage;
}

function detachInput(input) {
  input.onmidimessage = null;
}

function attachAllInputs() {
  for (const input of midiAccess.inputs.values()) {
    attachInput(input);
  }
}

function handleStateChange(event) {
  const port = event.port;
  if (port.type !== "input") {
    return;
  }
  if (port.state === "connected") {
    attachInput(port);
  } else {
    detachInput(port);
  }
  bus.emit("midi:devicechange", { name: port.name, state: port.state, inputs: getInputNames() });
}

function getInputNames() {
  if (!midiAccess) {
    return [];
  }
  return Array.from(midiAccess.inputs.values()).map((input) => input.name);
}

export async function initMIDIInput() {
  if (!navigator.requestMIDIAccess) {
    bus.emit("midi:unsupported", { reason: "Web MIDI API not available in this browser." });
    return null;
  }
  try {
    midiAccess = await navigator.requestMIDIAccess();
  } catch (error) {
    bus.emit("midi:unsupported", { reason: error.message });
    return null;
  }
  attachAllInputs();
  midiAccess.onstatechange = handleStateChange;
  bus.emit("midi:ready", { inputs: getInputNames() });
  return midiAccess;
}
