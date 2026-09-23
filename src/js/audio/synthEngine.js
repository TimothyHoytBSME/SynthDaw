import { createVoice } from "./voice.js";

const MAX_VOICES = 8;

// Every note carries its own patch and destination (per-track instruments), so this engine
// holds no patch of its own — only live-voice bookkeeping and the scheduled-voice registry.
export function createSynthEngine(audioContext, defaultDestination) {
  const activeVoices = new Map();
  const scheduledVoices = new Set();
  let voiceOrder = 0;
  let bendCents = 0;

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
      activeVoices.get(oldestNote).voice.stop(true);
      activeVoices.delete(oldestNote);
    }
  }

  return {
    noteOn(note, velocity, patch, destination = defaultDestination) {
      if (activeVoices.has(note)) {
        activeVoices.get(note).voice.stop(true);
        activeVoices.delete(note);
      } else if (activeVoices.size >= MAX_VOICES) {
        stealOldestVoice();
      }
      const voice = createVoice(audioContext, destination, note, velocity, patch, bendCents);
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
    // Applies to live voices only (sounding and future): pitch bend is a performance gesture,
    // not something sequenced playback should inherit.
    setPitchBend(cents) {
      bendCents = cents;
      for (const { voice } of activeVoices.values()) {
        voice.setBend(cents);
      }
    },
    // Pre-scheduled playback (sequencer): start+stop are both scheduled up front at exact
    // future AudioContext times, entirely separate from the live activeVoices/stealing pool
    // above (a sequenced note is never live-retriggered or stolen mid-playback).
    scheduleNote(note, velocity, startTime, durationSeconds, patch, destination = defaultDestination) {
      const voice = createVoice(audioContext, destination, note, velocity, patch);
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
