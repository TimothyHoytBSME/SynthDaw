import { noteToFrequency } from "./pitch.js";

const TAIL_SECONDS = 0.02;

function scheduleEnvelope(param, adsr, base, peak, startTime) {
  param.cancelScheduledValues(startTime);
  param.setValueAtTime(base, startTime);
  param.linearRampToValueAtTime(peak, startTime + adsr.attack);
  param.linearRampToValueAtTime(
    base + (peak - base) * adsr.sustain,
    startTime + adsr.attack + adsr.decay,
  );
}

function scheduleRelease(param, restValue, releaseSeconds, atTime) {
  // cancelAndHoldAtTime (not cancelScheduledValues + setValueAtTime(param.value, ...)) is required
  // here: this must work correctly for releases scheduled entirely in the future (sequenced
  // playback schedules start+stop together, well ahead of when either actually happens), where
  // reading `param.value` synchronously would give the value at call-time, not at `atTime`.
  param.cancelAndHoldAtTime(atTime);
  param.linearRampToValueAtTime(restValue, atTime + releaseSeconds);
}

export function createVoice(audioContext, destination, note, velocity, patch) {
  const baseFrequency = noteToFrequency(note);

  const oscillators = patch.oscillators.map((oscPatch) => {
    const oscillator = audioContext.createOscillator();
    oscillator.type = oscPatch.type;
    oscillator.frequency.value = baseFrequency;
    oscillator.detune.value = oscPatch.detune;

    const oscGain = audioContext.createGain();
    oscGain.gain.value = oscPatch.mix;
    oscillator.connect(oscGain);

    return { oscillator, oscGain };
  });

  const filter = audioContext.createBiquadFilter();
  filter.type = patch.filter.type;
  filter.frequency.value = patch.filter.cutoff;
  filter.Q.value = patch.filter.resonance;

  const ampGain = audioContext.createGain();
  ampGain.gain.value = 0;

  for (const { oscGain } of oscillators) {
    oscGain.connect(filter);
  }
  filter.connect(ampGain).connect(destination);

  let lfo = null;
  let lfoDepthGain = null;
  if (patch.lfo.depth > 0) {
    lfo = audioContext.createOscillator();
    lfo.frequency.value = patch.lfo.rate;
    lfoDepthGain = audioContext.createGain();
    lfoDepthGain.gain.value = patch.lfo.depth;
    lfo.connect(lfoDepthGain);

    if (patch.lfo.target === "pitch") {
      for (const { oscillator } of oscillators) {
        lfoDepthGain.connect(oscillator.detune);
      }
    } else if (patch.lfo.target === "filter") {
      lfoDepthGain.connect(filter.frequency);
    }
  }

  const peakGain = patch.gain * (velocity / 127);

  return {
    start(atTime) {
      const startTime = atTime ?? audioContext.currentTime;
      for (const { oscillator } of oscillators) {
        oscillator.start(startTime);
      }
      lfo?.start(startTime);

      scheduleEnvelope(ampGain.gain, patch.ampEnvelope, 0, peakGain, startTime);
      scheduleEnvelope(
        filter.frequency,
        patch.filterEnvelope,
        patch.filter.cutoff,
        patch.filter.cutoff + patch.filter.envAmount,
        startTime,
      );
    },
    stop(immediate = false, atTime) {
      const releaseAt = atTime ?? audioContext.currentTime;
      const releaseSeconds = immediate ? TAIL_SECONDS : patch.ampEnvelope.release;

      scheduleRelease(ampGain.gain, 0, releaseSeconds, releaseAt);
      scheduleRelease(filter.frequency, patch.filter.cutoff, releaseSeconds, releaseAt);

      const stopAt = releaseAt + releaseSeconds + TAIL_SECONDS;
      for (const { oscillator } of oscillators) {
        oscillator.stop(stopAt);
      }
      lfo?.stop(stopAt);
    },
    onEnded(callback) {
      oscillators[0].oscillator.onended = callback;
    },
  };
}
