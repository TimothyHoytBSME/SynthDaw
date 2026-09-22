import { createVoice } from "./voice.js";

const MAX_VOICES = 8;
const STEAL_RELEASE = true;

export function createSynthEngine(audioContext, destination) {
  let patch = null;
  const activeVoices = new Map();
  let voiceOrder = 0;

  function stealOldestVoice() {
    let oldestNote = null;
    let oldestOrder = Infinity;
    for (const [note, record] of activeVoices) {
      if (record.order < oldestOrder) {
        oldestOrder = record.order;
        oldestNote = note;
      }
    }
    if (oldestNote !== null) {
      activeVoices.get(oldestNote).voice.stop(STEAL_RELEASE);
      activeVoices.delete(oldestNote);
    }
  }

  return {
    setPatch(nextPatch) {
      patch = nextPatch;
    },
    noteOn(note, velocity) {
      if (!patch) {
        return;
      }
      if (activeVoices.has(note)) {
        activeVoices.get(note).voice.stop(STEAL_RELEASE);
        activeVoices.delete(note);
      } else if (activeVoices.size >= MAX_VOICES) {
        stealOldestVoice();
      }
      const voice = createVoice(audioContext, destination, note, velocity, patch);
      voice.start();
      activeVoices.set(note, { voice, order: voiceOrder++ });
    },
    noteOff(note) {
      const record = activeVoices.get(note);
      if (!record) {
        return;
      }
      record.voice.stop(false);
      activeVoices.delete(note);
    },
  };
}
