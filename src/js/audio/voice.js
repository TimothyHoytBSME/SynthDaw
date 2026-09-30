import { noteToFrequency } from "./pitch.js";

const TAIL_SECONDS = 0.02;
const CENTS_PER_OCTAVE = 1200;
const CENTS_PER_SEMITONE = 100;
// Full-scale values for the patch's normalized (0–1) LFO depth, per target.
const LFO_MAX_PITCH_CENTS = 100;
const LFO_MAX_FILTER_HZ = 4000;
const LFO_MAX_AMP_FRACTION = 0.5;
// Time constant for live patch edits on a sounding note: fast, but not a zipper-noise step.
const LIVE_EDIT_SMOOTHING = 0.015;
// setTargetAtTime reaches ~99% of the way after 5 time constants, so a pitch envelope's
// "decay" is the time for the sweep to (audibly) finish.
const PITCH_DECAY_TIME_CONSTANTS = 5;
const NOISE_SECONDS = 2;

// One looping white-noise buffer per context, shared by every noise oscillator. Each voice
// starts it at a random offset so overlapping hits don't phase against each other.
const noiseBuffers = new WeakMap();

function getNoiseBuffer(audioContext) {
  if (!noiseBuffers.has(audioContext)) {
    const length = Math.round(NOISE_SECONDS * audioContext.sampleRate);
    const buffer = audioContext.createBuffer(1, length, audioContext.sampleRate);
    const samples = buffer.getChannelData(0);
    for (let index = 0; index < length; index += 1) {
      samples[index] = Math.random() * 2 - 1;
    }
    noiseBuffers.set(audioContext, buffer);
  }
  return noiseBuffers.get(audioContext);
}

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

function baseDetuneFor(oscPatch) {
  return oscPatch.octave * CENTS_PER_OCTAVE + oscPatch.detune;
}

function createSource(audioContext, oscPatch, frequency, detune) {
  if (oscPatch.type === "noise") {
    const source = audioContext.createBufferSource();
    source.buffer = getNoiseBuffer(audioContext);
    source.loop = true;
    return source;
  }
  const oscillator = audioContext.createOscillator();
  oscillator.type = oscPatch.type;
  oscillator.frequency.value = frequency;
  oscillator.detune.value = detune;
  return oscillator;
}

// The voice keeps a reference to the track's patch object. `refresh()` re-reads it and moves
// every parameter that can change on a sounding note; a snapshot of what was last applied
// keeps untouched parameters (and their running envelopes) alone.
//
// Graph: sources -> oscGain (mix) -> filter -> envGain (ADSR, 0..1) -> levelGain -> destination.
// levelGain carries patch.gain * velocity and, for the amp LFO target, the tremolo.
export function createVoice(audioContext, destination, note, velocity, patch, bendCents = 0) {
  const baseFrequency = noteToFrequency(note);
  const velocityScale = velocity / 127;
  let applied = JSON.parse(JSON.stringify(patch));
  let startTime = null;
  let releaseAt = null;
  let releaseSeconds = 0;
  let stopAt = null;
  let bend = bendCents;

  const sources = patch.oscillators.map((oscPatch, index) => {
    const pitched = oscPatch.type !== "noise";
    const baseDetune = baseDetuneFor(oscPatch);
    const node = createSource(audioContext, oscPatch, baseFrequency, baseDetune + bend);
    const oscGain = audioContext.createGain();
    oscGain.gain.value = oscPatch.mix;
    node.connect(oscGain);
    return { node, oscGain, pitched, index };
  });
  const pitchedSources = sources.filter((source) => source.pitched);

  const filter = audioContext.createBiquadFilter();
  filter.type = patch.filter.type;
  filter.frequency.value = patch.filter.cutoff;
  filter.Q.value = patch.filter.resonance;

  const envGain = audioContext.createGain();
  envGain.gain.value = 0;
  const levelGain = audioContext.createGain();

  for (const { oscGain } of sources) {
    oscGain.connect(filter);
  }
  filter.connect(envGain).connect(levelGain).connect(destination);

  let lfo = null;
  let lfoDepthGain = null;
  let lfoTarget = null;

  function lfoParams(target) {
    if (target === "pitch") {
      return pitchedSources.map(({ node }) => node.detune);
    }
    return target === "filter" ? [filter.frequency] : [levelGain.gain];
  }

  // Tremolo multiplies the enveloped signal (level swings (1-2d)..1 times the base level)
  // rather than adding to the envelope, which would keep sounding after the release.
  function applyLevelAndLfoDepth(atTime) {
    const level = patch.gain * velocityScale;
    const ampDepth = patch.lfo.target === "amp" ? lfoDepthFor(patch.lfo) : 0;
    setSmoothly(levelGain.gain, level * (1 - ampDepth), atTime);
    if (lfoDepthGain) {
      const depth = patch.lfo.target === "amp" ? level * ampDepth : lfoDepthFor(patch.lfo);
      setSmoothly(lfoDepthGain.gain, depth, atTime);
    }
  }

  function setSmoothly(param, value, atTime) {
    if (atTime === undefined) {
      param.value = value;
    } else {
      param.setTargetAtTime(value, atTime, LIVE_EDIT_SMOOTHING);
    }
  }

  function routeLfo() {
    if (lfoTarget === patch.lfo.target) {
      return;
    }
    lfoDepthGain.disconnect();
    for (const param of lfoParams(patch.lfo.target)) {
      lfoDepthGain.connect(param);
    }
    lfoTarget = patch.lfo.target;
  }

  // Built on demand, so a patch with the LFO off costs nothing, and turning its depth up while
  // a note is held still brings the LFO in.
  function ensureLfo(atTime) {
    if (lfo) {
      return;
    }
    lfo = audioContext.createOscillator();
    lfo.frequency.value = patch.lfo.rate;
    lfoDepthGain = audioContext.createGain();
    lfoDepthGain.gain.value = 0;
    lfo.connect(lfoDepthGain);
    routeLfo();
    lfo.start(atTime);
    if (stopAt !== null) {
      lfo.stop(Math.max(stopAt, atTime));
    }
  }

  function schedulePitchEnvelope(atTime) {
    const { amount, decay } = patch.pitchEnvelope;
    if (amount === 0) {
      return;
    }
    for (const source of pitchedSources) {
      const target = source.node.detune.value;
      source.node.detune.setValueAtTime(target + amount * CENTS_PER_SEMITONE, atTime);
      source.node.detune.setTargetAtTime(target, atTime, decay / PITCH_DECAY_TIME_CONSTANTS);
    }
  }

  function filterSustainHz() {
    return patch.filter.cutoff + patch.filter.envAmount * patch.filterEnvelope.sustain;
  }

  // Moves an enveloped param to a new held level from `now`, then puts back the release a
  // sequenced note already has scheduled (cancelAndHoldAtTime removed it).
  function retargetHeld(param, value, restValue, now) {
    param.cancelAndHoldAtTime(now);
    param.setTargetAtTime(value, now, LIVE_EDIT_SMOOTHING);
    if (releaseAt !== null) {
      scheduleRelease(param, restValue, releaseSeconds, releaseAt);
    }
  }

  function changed(read) {
    return read(patch) !== read(applied);
  }

  function refresh() {
    const now = audioContext.currentTime;
    const sounding = startTime !== null && now >= startTime;
    const held = sounding && (releaseAt === null || now < releaseAt);

    patch.oscillators.forEach((oscPatch, index) => {
      const source = sources[index];
      const before = applied.oscillators[index];
      if (!source) {
        return;
      }
      if (oscPatch.mix !== before.mix) {
        setSmoothly(source.oscGain.gain, oscPatch.mix, now);
      }
      // Wave changes between pitched shapes are live; to or from noise needs a new note.
      if (source.pitched && oscPatch.type !== before.type && oscPatch.type !== "noise") {
        source.node.type = oscPatch.type;
      }
      if (source.pitched && sounding && baseDetuneFor(oscPatch) !== baseDetuneFor(before)) {
        source.node.detune.cancelScheduledValues(now);
        setSmoothly(source.node.detune, baseDetuneFor(oscPatch) + bend, now);
      }
    });

    if (changed((p) => p.filter.type)) {
      filter.type = patch.filter.type;
    }
    if (changed((p) => p.filter.resonance)) {
      setSmoothly(filter.Q, patch.filter.resonance, now);
    }
    const filterChanged =
      changed((p) => p.filter.cutoff) ||
      changed((p) => p.filter.envAmount) ||
      changed((p) => p.filterEnvelope.sustain);
    if (held && filterChanged) {
      retargetHeld(filter.frequency, filterSustainHz(), patch.filter.cutoff, now);
    }
    if (held && changed((p) => p.ampEnvelope.sustain)) {
      retargetHeld(envGain.gain, patch.ampEnvelope.sustain, 0, now);
    }

    if (patch.lfo.depth > 0 && startTime !== null) {
      ensureLfo(Math.max(now, startTime));
    }
    if (lfo) {
      routeLfo();
      if (changed((p) => p.lfo.rate)) {
        setSmoothly(lfo.frequency, patch.lfo.rate, now);
      }
    }
    applyLevelAndLfoDepth(now);

    applied = JSON.parse(JSON.stringify(patch));
  }

  applyLevelAndLfoDepth();

  return {
    patch,
    start(atTime) {
      startTime = atTime ?? audioContext.currentTime;
      sources.forEach(({ node, pitched }) => {
        if (pitched) {
          node.start(startTime);
        } else {
          node.start(startTime, Math.random() * NOISE_SECONDS);
        }
      });
      if (patch.lfo.depth > 0) {
        ensureLfo(startTime);
        applyLevelAndLfoDepth();
      }

      scheduleEnvelope(envGain.gain, patch.ampEnvelope, 0, 1, startTime);
      scheduleEnvelope(
        filter.frequency,
        patch.filterEnvelope,
        patch.filter.cutoff,
        patch.filter.cutoff + patch.filter.envAmount,
        startTime,
      );
      schedulePitchEnvelope(startTime);
    },
    stop(immediate = false, atTime) {
      releaseAt = atTime ?? audioContext.currentTime;
      releaseSeconds = immediate ? TAIL_SECONDS : patch.ampEnvelope.release;

      scheduleRelease(envGain.gain, 0, releaseSeconds, releaseAt);
      scheduleRelease(filter.frequency, patch.filter.cutoff, releaseSeconds, releaseAt);

      stopAt = releaseAt + releaseSeconds + TAIL_SECONDS;
      for (const { node } of sources) {
        node.stop(stopAt);
      }
      lfo?.stop(stopAt);
    },
    refresh,
    setBend(cents) {
      bend = cents;
      for (const { node, index } of pitchedSources) {
        node.detune.setTargetAtTime(baseDetuneFor(applied.oscillators[index]) + cents, audioContext.currentTime, 0.005);
      }
    },
    onEnded(callback) {
      sources[0].node.onended = callback;
    },
  };
}
