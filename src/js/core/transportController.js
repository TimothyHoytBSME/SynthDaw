import { createTransport } from "./transport.js";
import { playClick } from "../audio/click.js";
import { ensureAudioContext, getMasterGain, getMixer, scheduleNote } from "../audio/audioEngine.js";

let transport = null;
let metronomeEnabled = true;
let beatsPerBar = 4;
let project = null;

function beatsToSeconds(beats, tempo) {
  return beats * (60 / tempo);
}

function scheduleMetronome(windowStart, windowEnd, beatToContextTime) {
  if (!metronomeEnabled) {
    return;
  }
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
  for (const track of project.tracks) {
    const trackBus = mixer.getTrackBus(track.id);
    for (const block of track.blocks) {
      for (const note of block.notes) {
        const absoluteStart = block.startBeat + note.startBeat;
        if (absoluteStart >= windowStart && absoluteStart < windowEnd) {
          const durationSeconds = beatsToSeconds(note.lengthBeats, transport.getTempo());
          scheduleNote(
            note.note,
            note.velocity,
            beatToContextTime(absoluteStart),
            durationSeconds,
            trackBus.gainNode,
          );
        }
      }
    }
  }
}

function handleSchedule(windowStart, windowEnd, beatToContextTime) {
  scheduleMetronome(windowStart, windowEnd, beatToContextTime);
  scheduleProjectNotes(windowStart, windowEnd, beatToContextTime);
}

export function getTransport({ beatsPerBar: bpb } = {}) {
  if (bpb) {
    beatsPerBar = bpb;
  }
  if (!transport) {
    transport = createTransport(ensureAudioContext(), { onSchedule: handleSchedule });
  }
  return transport;
}

export function setProject(nextProject) {
  project = nextProject;
}

export function setMetronomeEnabled(enabled) {
  metronomeEnabled = enabled;
}

export function isMetronomeEnabled() {
  return metronomeEnabled;
}
