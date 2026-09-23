import { noteToFrequency } from "./pitch.js";

const TAIL_SECONDS = 0.02;
const CENTS_PER_OCTAVE = 1200;
// Full-scale values for the patch's normalized (0–1) LFO depth, per target.
const LFO_MAX_PITCH_CENTS = 100;
const LFO_MAX_FILTER_HZ = 4000;
const LFO_MAX_AMP_FRACTION = 0.5;

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

function lfoDepthFor(lfo) {
  if (lfo.target === "pitch") {
    return lfo.depth * LFO_MAX_PITCH_CENTS;
  }
  if (lfo.target === "filter") {
    return lfo.depth * LFO_MAX_FILTER_HZ;
  }
  return lfo.depth * LFO_MAX_AMP_FRACTION;
}

export function createVoice(audioContext, destination, note, velocity, patch, bendCents = 0) {
  const baseFrequency = noteToFrequency(note);
  const peakGain = patch.gain * (velocity / 127);

  const oscillators = patch.oscillators.map((oscPatch) => {
    const oscillator = audioContext.createOscillator();
    oscillator.type = oscPatch.type;
    oscillator.frequency.value = baseFrequency;
    const baseDetune = oscPatch.octave * CENTS_PER_OCTAVE + oscPatch.detune;
    oscillator.detune.value = baseDetune + bendCents;

    const oscGain = audioContext.createGain();
    oscGain.gain.value = oscPatch.mix;
    oscillator.connect(oscGain);

    return { oscillator, oscGain, baseDetune };
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
  filter.connect(ampGain);

  let lfo = null;
  if (patch.lfo.depth > 0) {
    lfo = audioContext.createOscillator();
    lfo.frequency.value = patch.lfo.rate;
    const lfoDepthGain = audioContext.createGain();
    lfoDepthGain.gain.value = lfoDepthFor(patch.lfo);
    lfo.connect(lfoDepthGain);

    if (patch.lfo.target === "pitch") {
      for (const { oscillator } of oscillators) {
        lfoDepthGain.connect(oscillator.detune);
      }
    } else if (patch.lfo.target === "filter") {
      lfoDepthGain.connect(filter.frequency);
    } else {
      // Tremolo multiplies the enveloped signal (gain swings 1-2d..1) rather than adding to
      // ampGain, which would keep sounding after the envelope has released to zero.
      const tremoloGain = audioContext.createGain();
      tremoloGain.gain.value = 1 - lfoDepthGain.gain.value;
      lfoDepthGain.connect(tremoloGain.gain);
      ampGain.connect(tremoloGain).connect(destination);
    }
  }
  if (patch.lfo.depth <= 0 || patch.lfo.target !== "amp") {
    ampGain.connect(destination);
  }

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
    setBend(cents) {
      for (const { oscillator, baseDetune } of oscillators) {
        oscillator.detune.setTargetAtTime(baseDetune + cents, audioContext.currentTime, 0.005);
      }
    },
    onEnded(callback) {
      oscillators[0].oscillator.onended = callback;
    },
  };
}
