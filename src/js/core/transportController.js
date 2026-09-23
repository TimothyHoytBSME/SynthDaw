import { bus } from "./eventBus.js";
import { createTransport } from "./transport.js";
import { playableNotes } from "./project.js";
import { playClick } from "../audio/click.js";
import {
  ensureAudioContext,
  getMasterGain,
  getMixer,
  scheduleNote,
  cancelScheduledNotes,
} from "../audio/audioEngine.js";

let transport = null;
let metronomeEnabled = true;
let project = null;

function beatsToSeconds(beats, tempo) {
  return beats * (60 / tempo);
}

function scheduleMetronome(windowStart, windowEnd, beatToContextTime) {
  if (!metronomeEnabled) {
    return;
  }
  const beatsPerBar = project?.timeSignature.beatsPerBar ?? 4;
  const firstBeat = Math.ceil(windowStart - 1e-9);
  for (let beat = firstBeat; beat < windowEnd; beat += 1) {
    const accented = Math.round(beat) % beatsPerBar === 0;
    playClick(ensureAudioContext(), getMasterGain(), beatToContextTime(beat), accented);
  }
}

function scheduleProjectNotes(windowStart, windowEnd, beatToContextTime) {
  if (!project) {
    return;
  }
  const mixer = getMixer();
  const tempo = transport.getTempo();
  for (const playable of playableNotes(project)) {
    if (playable.startBeat >= windowStart && playable.startBeat < windowEnd) {
      scheduleNote(
        playable.note,
        playable.velocity,
        beatToContextTime(playable.startBeat),
        beatsToSeconds(playable.lengthBeats, tempo),
        playable.track.patch,
        mixer.getTrackBus(playable.track.id).gainNode,
      );
    }
  }
}

function handleSchedule(windowStart, windowEnd, beatToContextTime) {
  scheduleMetronome(windowStart, windowEnd, beatToContextTime);
  scheduleProjectNotes(windowStart, windowEnd, beatToContextTime);
}

function loopsEqual(a, b) {
  return a.enabled === b.enabled && a.startBeat === b.startBeat && a.endBeat === b.endBeat;
}

// The transport follows the project, same as the mixer does in audioEngine.js: tempo and loop
// are read from the model after every change rather than pushed in by UI code.
function syncFromProject() {
  if (!project) {
    return;
  }
  const theTransport = getTransport();
  theTransport.setTempo(project.tempo);
  if (!loopsEqual(theTransport.getLoop(), project.loop)) {
    theTransport.setLoop({ ...project.loop });
  }
}

export function getTransport() {
  if (!transport) {
    transport = createTransport(ensureAudioContext(), {
      onSchedule: handleSchedule,
      onCancel: cancelScheduledNotes,
    });
  }
  return transport;
}

export function setProject(nextProject) {
  project = nextProject;
  syncFromProject();
}

export function initTransportController() {
  bus.on("project:changed", syncFromProject);
}

export function setMetronomeEnabled(enabled) {
  metronomeEnabled = enabled;
}

export function isMetronomeEnabled() {
  return metronomeEnabled;
}
