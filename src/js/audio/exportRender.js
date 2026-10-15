import { createSynthEngine } from "./synthEngine.js";
import { createMixer } from "./mixer.js";
import { ENGINE_SAMPLE_RATE } from "./audioEngine.js";
import { playableNotes } from "../core/project.js";

const RELEASE_TAIL_SECONDS = 2;
const MIN_DURATION_SECONDS = 1;
// Notes are added to the offline graph one chunk at a time, from suspend() callbacks, instead
// of all up front. A voice scheduled for the future still costs CPU from time zero (its nodes
// run and output silence), so up-front scheduling made render time grow with the note count:
// Neon Riptide's 2619 notes took 12.5 minutes, versus 2.7x faster chunked on Neon Pulse.
const CHUNK_BEATS = 4;
const CHUNK_LEAD_SECONDS = 0.05;

function sortedPlayableNotes(project) {
  return Array.from(playableNotes(project)).sort((a, b) => a.startBeat - b.startBeat);
}

function endBeatOf(notes) {
  return notes.reduce((end, note) => Math.max(end, note.startBeat + note.lengthBeats), 0);
}

// Renders the whole project offline, non-realtime, by standing up a second synth engine +
// mixer against an OfflineAudioContext instead of the live one — every audio module here
// (synthEngine.js, mixer.js, effectChain.js, effects/*) takes its AudioContext as a parameter
// rather than reaching for a global, specifically so this kind of parallel offline graph is
// possible without duplicating any DSP code. `onProgress(fraction)` is called as chunks are
// reached (0..1).
export async function renderProjectToBuffer(project, { onProgress } = {}) {
  const secondsPerBeat = 60 / project.tempo;
  const notes = sortedPlayableNotes(project);
  const endBeat = endBeatOf(notes);
  const durationSeconds = Math.max(MIN_DURATION_SECONDS, endBeat * secondsPerBeat + RELEASE_TAIL_SECONDS);

  const offlineContext = new OfflineAudioContext(
    2,
    Math.ceil(durationSeconds * ENGINE_SAMPLE_RATE),
    ENGINE_SAMPLE_RATE,
  );

  const masterGain = offlineContext.createGain();
  const mixer = createMixer(offlineContext, masterGain);
  mixer.syncProject(project);

  const synthEngine = createSynthEngine(offlineContext, masterGain);
  synthEngine.setTempo(project.tempo);

  let nextIndex = 0;
  function scheduleBefore(beat) {
    while (nextIndex < notes.length && notes[nextIndex].startBeat < beat) {
      const playable = notes[nextIndex];
      synthEngine.scheduleNote(
        playable.note,
        playable.velocity,
        playable.startBeat * secondsPerBeat,
        playable.lengthBeats * secondsPerBeat,
        playable.track.patch,
        mixer.getTrackBus(playable.track.id).gainNode,
      );
      nextIndex += 1;
    }
  }

  scheduleBefore(CHUNK_BEATS);
  for (let beat = CHUNK_BEATS; beat < endBeat; beat += CHUNK_BEATS) {
    const chunkStart = beat;
    const suspendAt = chunkStart * secondsPerBeat - CHUNK_LEAD_SECONDS;
    offlineContext.suspend(suspendAt).then(() => {
      scheduleBefore(chunkStart + CHUNK_BEATS);
      onProgress?.(suspendAt / durationSeconds);
      offlineContext.resume();
    });
  }

  const buffer = await offlineContext.startRendering();
  onProgress?.(1);
  return buffer;
}
