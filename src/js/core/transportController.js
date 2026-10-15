import { bus } from "./eventBus.js";
import { createTransport } from "./transport.js";
import { playableNotes } from "./project.js";
import { playClick } from "../audio/click.js";
import {
  ensureAudioContext,
  getClickDestination,
  getMixer,
  scheduleNote,
  cancelScheduledNotes,
} from "../audio/audioEngine.js";

let transport = null;
let metronomeEnabled = true;
let project = null;
// playableNotes(project) sorted by start, rebuilt lazily after each project change, so each
// 25 ms scheduler tick does a binary search instead of walking every note in the song.
let sortedNotes = null;

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
    playClick(ensureAudioContext(), getClickDestination(), beatToContextTime(beat), accented);
  }
}

function getSortedNotes() {
  if (!sortedNotes) {
    sortedNotes = Array.from(playableNotes(project)).sort((a, b) => a.startBeat - b.startBeat);
  }
  return sortedNotes;
}

// Index of the first note starting at or after `beat`.
function firstNoteIndexFrom(notes, beat) {
  let low = 0;
  let high = notes.length;
  while (low < high) {
    const middle = (low + high) >> 1;
    if (notes[middle].startBeat < beat) {
      low = middle + 1;
    } else {
      high = middle;
    }
  }
  return low;
}

function scheduleProjectNotes(windowStart, windowEnd, beatToContextTime) {
  if (!project) {
    return;
  }
  const mixer = getMixer();
  const tempo = transport.getTempo();
  const notes = getSortedNotes();
  for (let index = firstNoteIndexFrom(notes, windowStart); index < notes.length; index += 1) {
    const playable = notes[index];
    if (playable.startBeat >= windowEnd) {
      break;
    }
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
  sortedNotes = null;
  if (!project || !transport) {
    return; // getTransport() syncs as soon as the transport exists
  }
  transport.setTempo(project.tempo);
  if (!loopsEqual(transport.getLoop(), project.loop)) {
    transport.setLoop({ ...project.loop });
  }
}

// Creates the transport (and with it the AudioContext) on first real use — i.e. from a
// user action like Play — never at page load, so Chrome's autoplay policy has a gesture.
export function getTransport() {
  if (!transport) {
    transport = createTransport(ensureAudioContext(), {
      onSchedule: handleSchedule,
      onCancel: cancelScheduledNotes,
    });
    syncFromProject();
  }
  return transport;
}

// For read-only polling (the playhead): doesn't create the transport or AudioContext.
export function getPositionBeats() {
  return transport ? transport.getPositionBeats() : 0;
}

export function isTransportRunning() {
  return transport?.isRunning() ?? false;
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
