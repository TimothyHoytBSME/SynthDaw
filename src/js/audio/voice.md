# voice.js

Builds one polyphonic voice's full Web Audio graph from a [patch](./patch.md): N oscillators (each through its own mix `GainNode`) → one shared `BiquadFilter` → one amp `GainNode` (the ADSR target) → `destination`. An optional LFO (`OscillatorNode` + depth `GainNode`) connects either to every oscillator's `detune` param (`target: "pitch"`, vibrato) or to the filter's `frequency` param (`target: "filter"`, wobble) — skipped entirely when `patch.lfo.depth` is 0, so a silent LFO costs nothing.

`scheduleEnvelope` drives both the amp gain and the filter-cutoff envelope with the same attack/decay/sustain shape (different base/peak values), relying on the fact that reading `AudioParam.value` mid-ramp returns the currently-interpolated value (used by `scheduleRelease` to start the release from wherever the envelope currently is, not from a stale target). `start()`/`stop()` is single-use — a voice cannot be restarted after `stop()`, matching `OscillatorNode.stop()` being terminal.

`stop(immediate)`: `immediate = true` (used when [synthEngine.js](./synthEngine.md) retriggers or steals a voice) forces a fast fixed release instead of the patch's own release, so cutting a voice short never clicks.
