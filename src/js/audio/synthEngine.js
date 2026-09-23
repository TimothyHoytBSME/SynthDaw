import { createVoice } from "./voice.js";

const MAX_VOICES = 8;
const STEAL_RELEASE = true;

export function createSynthEngine(audioContext, destination) {
  let patch = null;
  const activeVoices = new Map();
  const scheduledVoices = new Set();
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
    // Pre-scheduled playback (sequencer): start+stop are both scheduled up front at exact
    // future AudioContext times, entirely separate from the live activeVoices/stealing pool
    // above (a sequenced note is never live-retriggered or stolen mid-playback).
    scheduleNote(note, velocity, startTime, durationSeconds, destinationOverride) {
      if (!patch) {
        return;
      }
      const voice = createVoice(audioContext, destinationOverride ?? destination, note, velocity, patch);
      voice.start(startTime);
      voice.stop(false, startTime + durationSeconds);
      scheduledVoices.add(voice);
      voice.onEnded(() => scheduledVoices.delete(voice));
    },
    // Silences every sequenced voice — sounding or still waiting to start — with a short
    // fade, for when the transport stops/pauses/seeks and what was scheduled is now wrong.
    cancelScheduled() {
      for (const voice of scheduledVoices) {
        voice.stop(true);
      }
      scheduledVoices.clear();
    },
  };
}
