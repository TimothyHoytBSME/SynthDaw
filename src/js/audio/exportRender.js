import { createSynthEngine } from "./synthEngine.js";
import { createMixer } from "./mixer.js";
import { playableNotes } from "../core/project.js";

const SAMPLE_RATE = 44100;
const RELEASE_TAIL_SECONDS = 2;
const MIN_DURATION_SECONDS = 1;

function projectEndBeat(project) {
  let endBeat = 0;
  for (const playable of playableNotes(project)) {
    endBeat = Math.max(endBeat, playable.startBeat + playable.lengthBeats);
  }
  return endBeat;
}

// Renders the whole project offline, non-realtime, by standing up a second synth engine +
// mixer against an OfflineAudioContext instead of the live one — every audio module here
// (synthEngine.js, mixer.js, effectChain.js, effects/*) takes its AudioContext as a parameter
// rather than reaching for a global, specifically so this kind of parallel offline graph is
// possible without duplicating any DSP code.
export async function renderProjectToBuffer(project) {
  const secondsPerBeat = 60 / project.tempo;
  const durationSeconds = Math.max(
    MIN_DURATION_SECONDS,
    projectEndBeat(project) * secondsPerBeat + RELEASE_TAIL_SECONDS,
  );

  const offlineContext = new OfflineAudioContext(
    2,
    Math.ceil(durationSeconds * SAMPLE_RATE),
    SAMPLE_RATE,
  );

  const masterGain = offlineContext.createGain();
  const mixer = createMixer(offlineContext, masterGain);
  mixer.syncProject(project);

  const synthEngine = createSynthEngine(offlineContext, masterGain);

  for (const playable of playableNotes(project)) {
    synthEngine.scheduleNote(
      playable.note,
      playable.velocity,
      playable.startBeat * secondsPerBeat,
      playable.lengthBeats * secondsPerBeat,
      playable.track.patch,
      mixer.getTrackBus(playable.track.id).gainNode,
    );
  }

  return offlineContext.startRendering();
}
