# voice.js

One sounding note: `createVoice(audioContext, destination, note, velocity, patch, bendCents)` builds the signal chain oscillators (each with its own level gain) -> shared biquad filter -> amp gain (ADSR, peak = `patch.gain * velocity/127`) -> [tremolo gain] -> destination. It returns `{ start(atTime), stop(immediate, atTime), setBend(cents), onEnded(callback) }`.

- Oscillator pitch = note frequency plus `detune = octave*1200 + detune + bend` cents. Octave is done in cents so bend and LFO can share the same `detune` param.
- The filter envelope sweeps `cutoff -> cutoff + envAmount`, following the filter ADSR.
- LFO (only built when `depth > 0`) targets: `pitch` -> every oscillator's `detune`; `filter` -> `filter.frequency`; `amp` -> a separate tremolo `GainNode` that *multiplies* the enveloped signal. Adding the LFO to the amp envelope's gain instead would keep sounding after the release reached zero.
- **Release must use `cancelAndHoldAtTime`:** sequenced notes schedule their release long in advance, so reading `param.value` synchronously would capture the wrong value. See the comment on `scheduleRelease`.
- `stop(true)` is a fast (~20ms) release used for voice stealing and transport cancel. Oscillators are stopped at release end + a short tail.
