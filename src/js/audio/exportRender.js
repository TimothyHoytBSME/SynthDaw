import { createSynthEngine } from "./synthEngine.js";
import { createMixer } from "./mixer.js";

const SAMPLE_RATE = 44100;
const RELEASE_TAIL_SECONDS = 2;
const MIN_DURATION_SECONDS = 1;

function projectEndBeat(project) {
  let endBeat = 0;
  for (const track of project.tracks) {
    for (const block of track.blocks) {
      for (const note of block.notes) {
        endBeat = Math.max(endBeat, block.startBeat + note.startBeat + note.lengthBeats);
      }
    }
  }
  return endBeat;
}

// Renders the whole project offline, non-realtime, by standing up a second synth engine +
// mixer against an OfflineAudioContext instead of the live one — every audio module here
// (synthEngine.js, mixer.js, effectChain.js, effects/*) takes its AudioContext as a parameter
// rather than reaching for a global, specifically so this kind of parallel offline graph is
// possible without duplicating any DSP code.
export async function renderProjectToBuffer(project, patch) {
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
  mixer.syncMasterEffects(project.master.effects);
  mixer.syncMasterVolume(project.master.volume);

  const synthEngine = createSynthEngine(offlineContext, masterGain);
  synthEngine.setPatch(patch);

  for (const track of project.tracks) {
    const trackBus = mixer.getTrackBus(track.id);
    mixer.syncTrackEffects(track);
    for (const block of track.blocks) {
      for (const note of block.notes) {
        const startTime = (block.startBeat + note.startBeat) * secondsPerBeat;
        const noteDurationSeconds = note.lengthBeats * secondsPerBeat;
        synthEngine.scheduleNote(
          note.note,
          note.velocity,
          startTime,
          noteDurationSeconds,
          trackBus.gainNode,
        );
      }
    }
  }
  mixer.syncTrackGains(project);

  return offlineContext.startRendering();
}
